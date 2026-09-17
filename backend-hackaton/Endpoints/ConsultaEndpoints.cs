using System.Security.Claims;
using Anaminese.API.DTOs;
using Anaminese.API.Models;
using Anaminese.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Anaminese.API.Endpoints;

public static class ConsultaEndpoints
{
    public static RouteGroupBuilder MapConsultas(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/consultas")
            .WithTags("Consultas");

        // Público — usado pela FastAPI (agent) e pelo chatbot mock ao gravar
        group.MapPost("/", CriarConsulta)
            .WithName("CriarConsulta")
            .WithSummary("Registra uma consulta com classificação Manchester");

        // Protegidos — recepcionista vê consultas do próprio consultório
        group.MapGet("/", ListarTodas)
            .RequireAuthorization()
            .WithName("ListarConsultas")
            .WithSummary("Lista as consultas mais recentes (recepcionista: do seu consultório)");

        group.MapGet("/{id}", BuscarConsulta)
            .RequireAuthorization()
            .WithName("BuscarConsulta")
            .WithSummary("Busca consulta pelo ID (respeita perfil)");

        group.MapGet("/paciente/{cpf}", ListarConsultasPorPaciente)
            .RequireAuthorization()
            .WithName("ListarConsultasPorPaciente")
            .WithSummary("Lista consultas de um paciente (paciente: só o próprio CPF; recepcionista: só do seu consultório)");

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

    private static async Task<Ok<IEnumerable<ConsultaResponse>>> ListarTodas(
        ClaimsPrincipal user,
        IConsultaService service,
        int? limite)
    {
        var (tipo, consultorioId, cpf) = ExtrairContexto(user);
        var lim = limite ?? 50;

        var consultas = tipo switch
        {
            TipoUsuario.Paciente when !string.IsNullOrEmpty(cpf)
                => await service.ListarPorPacienteAsync(cpf),
            TipoUsuario.Recepcionista when !string.IsNullOrEmpty(consultorioId)
                => await service.ListarPorConsultorioAsync(consultorioId, lim),
            _ => Enumerable.Empty<ConsultaResponse>()
        };

        return TypedResults.Ok(consultas);
    }

    private static async Task<Results<Ok<ConsultaResponse>, NotFound, ForbidHttpResult>> BuscarConsulta(
        string id,
        ClaimsPrincipal user,
        IConsultaService service)
    {
        var consulta = await service.BuscarPorIdAsync(id);
        if (consulta is null) return TypedResults.NotFound();

        var (tipo, consultorioId, cpf) = ExtrairContexto(user);
        var permitido = tipo switch
        {
            TipoUsuario.Paciente => consulta.PacienteCpf == cpf,
            TipoUsuario.Recepcionista => consulta.ConsultorioId == consultorioId,
            _ => false
        };

        return permitido ? TypedResults.Ok(consulta) : TypedResults.Forbid();
    }

    private static async Task<Results<Ok<IEnumerable<ConsultaResponse>>, ForbidHttpResult>> ListarConsultasPorPaciente(
        string cpf,
        ClaimsPrincipal user,
        IConsultaService consultaService,
        IPacienteService pacienteService)
    {
        var (tipo, consultorioId, userCpf) = ExtrairContexto(user);

        if (tipo == TipoUsuario.Paciente)
        {
            if (cpf != userCpf) return TypedResults.Forbid();
        }
        else if (tipo == TipoUsuario.Recepcionista)
        {
            var paciente = await pacienteService.BuscarComConsultorioAsync(cpf);
            if (paciente is null || paciente.ConsultorioId != consultorioId)
                return TypedResults.Forbid();
        }
        else
        {
            return TypedResults.Forbid();
        }

        var consultas = await consultaService.ListarPorPacienteAsync(cpf);
        return TypedResults.Ok(consultas);
    }

    private static (TipoUsuario tipo, string consultorioId, string cpf) ExtrairContexto(ClaimsPrincipal user)
    {
        var roleStr = user.FindFirstValue(ClaimTypes.Role) ?? nameof(TipoUsuario.Paciente);
        var tipo = Enum.TryParse<TipoUsuario>(roleStr, out var t) ? t : TipoUsuario.Paciente;
        var consultorioId = user.FindFirstValue("consultorioId") ?? string.Empty;
        var cpf = user.FindFirstValue("cpf") ?? string.Empty;
        return (tipo, consultorioId, cpf);
    }
}
