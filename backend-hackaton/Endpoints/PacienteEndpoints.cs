using System.Security.Claims;
using Anaminese.API.DTOs;
using Anaminese.API.Models;
using Anaminese.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Anaminese.API.Endpoints;

public static class PacienteEndpoints
{
    public static RouteGroupBuilder MapPacientes(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/pacientes")
            .WithTags("Pacientes");

        // Público — mantido para compatibilidade com o chat e cadastros iniciais.
        // Cadastro por auth: use POST /auth/register com Tipo=Paciente.
        group.MapPost("/", CriarPaciente)
            .WithName("CriarPaciente")
            .WithSummary("Cadastra um novo paciente (público)");

        // Protegido — paciente só vê o próprio CPF; recepcionista só do próprio consultório
        group.MapGet("/{cpf}", BuscarPaciente)
            .RequireAuthorization()
            .WithName("BuscarPaciente")
            .WithSummary("Busca paciente pelo CPF (respeita perfil)");

        group.MapPut("/{cpf}", AtualizarPaciente)
            .RequireAuthorization()
            .WithName("AtualizarPaciente")
            .WithSummary("Atualiza os dados do próprio paciente");

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

    private static async Task<Results<Ok<PacienteResponse>, NotFound, ForbidHttpResult>> BuscarPaciente(
        string cpf,
        ClaimsPrincipal user,
        IPacienteService service)
    {
        var paciente = await service.BuscarPorCpfAsync(cpf);
        if (paciente is null) return TypedResults.NotFound();

        var roleStr = user.FindFirstValue(ClaimTypes.Role) ?? nameof(TipoUsuario.Paciente);
        var tipo = Enum.TryParse<TipoUsuario>(roleStr, out var t) ? t : TipoUsuario.Paciente;
        var userCpf = user.FindFirstValue("cpf");
        var userConsultorioId = user.FindFirstValue("consultorioId");

        var permitido = tipo switch
        {
            TipoUsuario.Paciente => cpf == userCpf,
            TipoUsuario.Recepcionista => false,  // regra: precisa buscar Paciente completo pra checar consultorio
            _ => false
        };

        // Recepcionista precisa comparar consultorioId do paciente (o response não expõe, então buscamos no Firestore direto se precisar)
        if (tipo == TipoUsuario.Recepcionista && !string.IsNullOrEmpty(userConsultorioId))
        {
            // Como o PacienteResponse não expõe ConsultorioId, buscamos no Firestore via BuscarComConsultorioAsync
            var comConsultorio = await service.BuscarComConsultorioAsync(cpf);
            permitido = comConsultorio is not null && comConsultorio.ConsultorioId == userConsultorioId;
        }

        return permitido ? TypedResults.Ok(paciente) : TypedResults.Forbid();
    }

    private static async Task<Results<Ok<PacienteResponse>, NotFound, ForbidHttpResult>> AtualizarPaciente(
        string cpf,
        AtualizarPacienteRequest request,
        ClaimsPrincipal user,
        IPacienteService service)
    {
        var tipo = user.FindFirstValue(ClaimTypes.Role);
        var userCpf = user.FindFirstValue("cpf");
        if (tipo != nameof(TipoUsuario.Paciente) || cpf != userCpf)
            return TypedResults.Forbid();

        var paciente = await service.AtualizarAsync(cpf, request);
        return paciente is not null ? TypedResults.Ok(paciente) : TypedResults.NotFound();
    }
}
