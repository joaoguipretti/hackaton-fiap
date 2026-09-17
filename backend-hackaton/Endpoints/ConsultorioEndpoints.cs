using Anaminese.API.DTOs;
using Anaminese.API.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Anaminese.API.Endpoints;

public static class ConsultorioEndpoints
{
    public static RouteGroupBuilder MapConsultorios(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/consultorios")
            .WithTags("Consultorios");

        group.MapPost("/", Criar)
            .WithName("CriarConsultorio")
            .WithSummary("Cadastra um novo consultório");

        group.MapGet("/", ListarTodos)
            .WithName("ListarConsultorios")
            .WithSummary("Lista todos os consultórios cadastrados");

        group.MapGet("/{id}", Buscar)
            .WithName("BuscarConsultorio")
            .WithSummary("Busca consultório pelo ID");

        return group;
    }

    private static async Task<Created<ConsultorioResponse>> Criar(
        CriarConsultorioRequest request,
        IConsultorioService service)
    {
        var c = await service.CriarAsync(request);
        return TypedResults.Created($"/consultorios/{c.Id}", c);
    }

    private static async Task<Ok<IEnumerable<ConsultorioResponse>>> ListarTodos(
        IConsultorioService service)
    {
        var lista = await service.ListarTodosAsync();
        return TypedResults.Ok(lista);
    }

    private static async Task<Results<Ok<ConsultorioResponse>, NotFound>> Buscar(
        string id,
        IConsultorioService service)
    {
        var c = await service.BuscarPorIdAsync(id);
        return c is not null ? TypedResults.Ok(c) : TypedResults.NotFound();
    }
}
