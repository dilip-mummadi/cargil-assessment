using Microsoft.AspNetCore.Http;

namespace Crr.Api.Application;

public sealed record RiskFilters(
    string? Book,
    string? Commodity,
    string? Region,
    string? Currency,
    string? InstrumentType,
    string? Search)
{
    public static RiskFilters FromQuery(IQueryCollection query) => new(
        Read(query, "book"),
        Read(query, "commodity"),
        Read(query, "region"),
        Read(query, "currency"),
        Read(query, "instrumentType"),
        Read(query, "search"));

    private static string? Read(IQueryCollection query, string key)
    {
        var value = query[key].FirstOrDefault()?.Trim();
        return string.IsNullOrEmpty(value) ? null : value;
    }
}
