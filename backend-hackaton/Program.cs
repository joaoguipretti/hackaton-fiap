using Anaminese.API.Endpoints;
using Anaminese.API.Services;
using Google.Cloud.Firestore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

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
builder.Services.AddScoped<IChatbotService, ChatbotService>();

// OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseCors("Frontend");

app.MapOpenApi();
app.MapScalarApiReference(opts => opts.Title = "Diagnostica IA API");

app.MapPacientes();
app.MapConsultas();
app.MapChatbot();

app.Run();
