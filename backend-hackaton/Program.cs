using Anaminese.API.Endpoints;
using Anaminese.API.Services;
using Google.Cloud.Firestore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Firestore
var projectId = builder.Configuration["Firebase:ProjectId"]
    ?? throw new InvalidOperationException("Firebase:ProjectId não configurado.");

var credentialsPath = Path.Combine(AppContext.BaseDirectory, "firebase-sa.json");
builder.Services.AddSingleton(_ => new FirestoreDbBuilder
{
    ProjectId = projectId,
    CredentialsPath = credentialsPath
}.Build());

// Services
builder.Services.AddScoped<IPacienteService, PacienteService>();
builder.Services.AddScoped<IConsultaService, ConsultaService>();

// OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

app.MapOpenApi();
app.MapScalarApiReference(opts => opts.Title = "Anaminese.AI API");

app.MapPacientes();
app.MapConsultas();

app.Run();
