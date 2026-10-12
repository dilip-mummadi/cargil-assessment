using Crr.Api.Domain;

namespace Crr.Api.Application;

public sealed record RiskPage(IReadOnlyList<RiskPosition> Rows, int TotalCount);
