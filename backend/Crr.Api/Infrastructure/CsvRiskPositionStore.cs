using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using Crr.Api.Domain;

namespace Crr.Api.Infrastructure;

public sealed class CsvRiskPositionStore
{
    public IReadOnlyList<RiskPosition> Positions { get; }

    public CsvRiskPositionStore()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "risk_positions.csv");
        if (!File.Exists(path))
        {
            throw new FileNotFoundException("The risk positions CSV was not found beside the API output.", path);
        }

        using var reader = new StreamReader(path);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            PrepareHeaderForMatch = args => args.Header.Trim(),
            MissingFieldFound = null,
            HeaderValidated = null
        });

        csv.Context.RegisterClassMap<RiskPositionMap>();
        Positions = csv.GetRecords<RiskPosition>().ToArray();
    }
}

public sealed class RiskPositionMap : ClassMap<RiskPosition>
{
    public RiskPositionMap()
    {
        Map(position => position.TradeId).Name("tradeId");
        Map(position => position.Book).Name("book");
        Map(position => position.Commodity).Name("commodity");
        Map(position => position.Counterparty).Name("counterparty");
        Map(position => position.Region).Name("region");
        Map(position => position.InstrumentType).Name("instrumentType");
        Map(position => position.Position).Name("position");
        Map(position => position.Currency).Name("currency");
        Map(position => position.MarketPrice).Name("marketPrice");
        Map(position => position.Pnl).Name("pnl");
        Map(position => position.FxExposure).Name("fxExposure");
        Map(position => position.AsOfDate).Name("asOfDate");
    }
}
