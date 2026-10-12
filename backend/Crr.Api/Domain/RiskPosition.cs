namespace Crr.Api.Domain;

public sealed class RiskPosition
{
    public string TradeId { get; set; } = string.Empty;
    public string Book { get; set; } = string.Empty;
    public string Commodity { get; set; } = string.Empty;
    public string Counterparty { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string InstrumentType { get; set; } = string.Empty;
    public decimal Position { get; set; }
    public string Currency { get; set; } = string.Empty;
    public decimal MarketPrice { get; set; }
    public decimal Pnl { get; set; }
    public decimal FxExposure { get; set; }
    public DateOnly AsOfDate { get; set; }
}
