using Crr.Api.Domain;
using Crr.Api.Infrastructure;

namespace Crr.Api.Application;

public sealed class RiskPositionService(CsvRiskPositionStore store)
{
    public RiskPage GetPage(
        RiskFilters filters,
        int startRow,
        int endRow,
        string? sortBy,
        string? sortDirection)
    {
        var filtered = ApplyFilters(filters);
        var totalCount = filtered.Count;
        var sorted = Sort(filtered, sortBy, sortDirection);

        return new RiskPage(sorted.Skip(startRow).Take(endRow - startRow).ToArray(), totalCount);
    }

    public RiskSummary GetSummary(RiskFilters filters, string groupBy)
    {
        var filtered = ApplyFilters(filters);
        var groups = filtered
            .GroupBy(position => groupBy == "book" ? position.Book : position.Commodity)
            .Select(group => new RiskGroup(
                group.Key,
                group.Count(),
                groupBy == "commodity" ? group.Sum(position => position.Position) : null,
                group.Sum(position => position.Pnl),
                group.Sum(position => position.FxExposure)))
            .OrderByDescending(group => group.Pnl)
            .ToArray();

        return new RiskSummary(
            filtered.Count,
            filtered.Sum(position => position.Pnl),
            filtered.Sum(position => position.FxExposure),
            groupBy,
            groups);
    }

    public object GetMetadata() => new
    {
        asOfDate = store.Positions.Max(position => position.AsOfDate),
        books = store.Positions.Select(position => position.Book).Distinct().Order().ToArray(),
        commodities = store.Positions.Select(position => position.Commodity).Distinct().Order().ToArray(),
        regions = store.Positions.Select(position => position.Region).Distinct().Order().ToArray(),
        currencies = store.Positions.Select(position => position.Currency).Distinct().Order().ToArray(),
        instrumentTypes = store.Positions.Select(position => position.InstrumentType).Distinct().Order().ToArray()
    };

    public RiskPosition? GetByTradeId(string tradeId) =>
        store.Positions.FirstOrDefault(position =>
            string.Equals(position.TradeId, tradeId, StringComparison.OrdinalIgnoreCase));

    private List<RiskPosition> ApplyFilters(RiskFilters filters) => store.Positions
        .Where(position => Matches(position.Book, filters.Book))
        .Where(position => Matches(position.Commodity, filters.Commodity))
        .Where(position => Matches(position.Region, filters.Region))
        .Where(position => Matches(position.Currency, filters.Currency))
        .Where(position => Matches(position.InstrumentType, filters.InstrumentType))
        .Where(position => string.IsNullOrWhiteSpace(filters.Search)
            || position.Counterparty.Contains(filters.Search, StringComparison.OrdinalIgnoreCase)
            || position.Commodity.Contains(filters.Search, StringComparison.OrdinalIgnoreCase)
            || position.TradeId.Contains(filters.Search, StringComparison.OrdinalIgnoreCase))
        .ToList();

    private static bool Matches(string value, string? filter) =>
        string.IsNullOrWhiteSpace(filter)
        || string.Equals(value, filter, StringComparison.OrdinalIgnoreCase);

    private static IEnumerable<RiskPosition> Sort(
        IEnumerable<RiskPosition> positions,
        string? sortBy,
        string? sortDirection)
    {
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);

        return (sortBy?.ToLowerInvariant(), descending) switch
        {
            ("book", false) => positions.OrderBy(position => position.Book),
            ("book", true) => positions.OrderByDescending(position => position.Book),
            ("commodity", false) => positions.OrderBy(position => position.Commodity),
            ("commodity", true) => positions.OrderByDescending(position => position.Commodity),
            ("counterparty", false) => positions.OrderBy(position => position.Counterparty),
            ("counterparty", true) => positions.OrderByDescending(position => position.Counterparty),
            ("region", false) => positions.OrderBy(position => position.Region),
            ("region", true) => positions.OrderByDescending(position => position.Region),
            ("position", false) => positions.OrderBy(position => position.Position),
            ("position", true) => positions.OrderByDescending(position => position.Position),
            ("marketprice", false) => positions.OrderBy(position => position.MarketPrice),
            ("marketprice", true) => positions.OrderByDescending(position => position.MarketPrice),
            ("pnl", false) => positions.OrderBy(position => position.Pnl),
            ("pnl", true) => positions.OrderByDescending(position => position.Pnl),
            ("fxexposure", false) => positions.OrderBy(position => position.FxExposure),
            ("fxexposure", true) => positions.OrderByDescending(position => position.FxExposure),
            ("asofdate", false) => positions.OrderBy(position => position.AsOfDate),
            ("asofdate", true) => positions.OrderByDescending(position => position.AsOfDate),
            (_, _) => positions.OrderBy(position => position.TradeId)
        };
    }
}
