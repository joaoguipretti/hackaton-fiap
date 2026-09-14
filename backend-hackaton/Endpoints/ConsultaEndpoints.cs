using Anaminese.API.DTOs;
using Anaminese.API.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Anaminese.API.Endpoints;

public static class ConsultaEndpoints
{
    public static RouteGroupBuilder MapConsultas(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/consultas")
            .WithTags("Consultas");

        group.MapPost("/", CriarConsulta)
            .WithName("CriarConsulta")
            .WithSummary("Registra uma consulta com classificação Manchester");

        group.MapGet("/{id}", BuscarConsulta)
            .WithName("BuscarConsulta")
            .WithSummary("Busca consulta pelo ID");

        group.MapGet("/paciente/{cpf}", ListarConsultasPorPaciente)
            .WithName("ListarConsultasPorPaciente")
            .WithSummary("Lista todas as consultas de um paciente");

        return group;
    }

    private static async Task<Results<Created<ConsultaResponse>, NotFound<string>>> CriarConsulta(
        CriarConsultaRequest request,
        IConsultaService consultaService,
        IPacienteService pacienteService)
    {
        var paciente = await pacienteService.BuscarPorCpfAsync(request.PacienteCpf);
        if (paciente is null)
            return TypedResults.NotFound($"Paciente com CPF {request.PacienteCpf} não encontrado.");

        var consulta = await consultaService.CriarAsync(request);
        return TypedResults.Created($"/consultas/{consulta.Id}", consulta);
    }

    private static async Task<Results<Ok<ConsultaResponse>, NotFound>> BuscarConsulta(
        string id,
        IConsultaService service)
    {
        var consulta = await service.BuscarPorIdAsync(id);
        return consulta is not null
            ? TypedResults.Ok(consulta)
            : TypedResults.NotFound();
    }

    private static async Task<Ok<IEnumerable<ConsultaResponse>>> ListarConsultasPorPaciente(
        string cpf,
        IConsultaService service)
    {
        var consultas = await service.ListarPorPacienteAsync(cpf);
        return TypedResults.Ok(consultas);
    }
}
