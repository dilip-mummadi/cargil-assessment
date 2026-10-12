namespace Crr.Api.Application;

public sealed record RiskSummary(
    int TotalCount,
    decimal TotalPnl,
    decimal TotalFxExposure,
    string GroupBy,
    IReadOnlyList<RiskGroup> Groups);

public sealed record RiskGroup(
    string Key,
    int Count,
    decimal? Position,
    decimal Pnl,
    decimal FxExposure);
