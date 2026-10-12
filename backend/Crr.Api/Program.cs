using Crr.Api.Application;
using Crr.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options => options.AddPolicy("localFrontend", policy =>
	policy.WithOrigins("http://localhost:5173")
		.AllowAnyHeader()
		.AllowAnyMethod()));
builder.Services.AddSingleton<CsvRiskPositionStore>();
builder.Services.AddSingleton<RiskPositionService>();

var app = builder.Build();
app.UseCors("localFrontend");

app.MapGet("/api/health", (CsvRiskPositionStore store) => Results.Ok(new
{
	status = "healthy",
	rowCount = store.Positions.Count
}));

app.MapGet("/api/metadata", (RiskPositionService service) => Results.Ok(service.GetMetadata()));

app.MapGet("/api/positions", (HttpContext context, RiskPositionService service) =>
{
	var query = context.Request.Query;
	var startRow = ReadInt(query, "startRow", 0);
	var endRow = ReadInt(query, "endRow", 100);
	if (startRow < 0 || endRow <= startRow || endRow - startRow > 500)
	{
		return Results.BadRequest(new { error = "Use a valid range of at most 500 rows." });
	}

	return Results.Ok(service.GetPage(
		RiskFilters.FromQuery(query),
		startRow,
		endRow,
		query["sortBy"],
		query["sortDirection"]));
});

app.MapGet("/api/summary", (HttpContext context, RiskPositionService service) =>
{
	var query = context.Request.Query;
	var groupBy = string.Equals(query["groupBy"], "book", StringComparison.OrdinalIgnoreCase)
		? "book"
		: "commodity";

	return Results.Ok(service.GetSummary(RiskFilters.FromQuery(query), groupBy));
});

app.MapGet("/api/positions/{tradeId}", (string tradeId, RiskPositionService service) =>
{
	var position = service.GetByTradeId(tradeId);
	return position is null ? Results.NotFound() : Results.Ok(position);
});

await app.RunAsync();

static int ReadInt(IQueryCollection query, string key, int defaultValue) =>
	int.TryParse(query[key], out var value) ? value : defaultValue;
