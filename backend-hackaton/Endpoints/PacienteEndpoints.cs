using Anaminese.API.DTOs;
using Anaminese.API.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Anaminese.API.Endpoints;

public static class PacienteEndpoints
{
    public static RouteGroupBuilder MapPacientes(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/pacientes")
            .WithTags("Pacientes");

        group.MapPost("/", CriarPaciente)
            .WithName("CriarPaciente")
            .WithSummary("Cadastra um novo paciente");

        group.MapGet("/{cpf}", BuscarPaciente)
            .WithName("BuscarPaciente")
            .WithSummary("Busca paciente pelo CPF");

        return group;
    }

    private static async Task<Results<Created<PacienteResponse>, Conflict<string>>> CriarPaciente(
        CriarPacienteRequest request,
        IPacienteService service)
    {
        var existente = await service.BuscarPorCpfAsync(request.Cpf);
        if (existente is not null)
            return TypedResults.Conflict($"Paciente com CPF {request.Cpf} já cadastrado.");

        var paciente = await service.CriarAsync(request);
        return TypedResults.Created($"/pacientes/{paciente.Cpf}", paciente);
    }

    private static async Task<Results<Ok<PacienteResponse>, NotFound>> BuscarPaciente(
        string cpf,
        IPacienteService service)
    {
        var paciente = await service.BuscarPorCpfAsync(cpf);
        return paciente is not null
            ? TypedResults.Ok(paciente)
            : TypedResults.NotFound();
    }
}
