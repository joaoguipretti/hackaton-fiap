using System.Security.Claims;
using Anaminese.API.DTOs;
using Anaminese.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Anaminese.API.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuth(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth")
            .WithTags("Auth");

        group.MapPost("/register", Register)
            .WithName("Register")
            .WithSummary("Cadastra um novo usuário (paciente ou recepcionista)");

        group.MapPost("/login", Login)
            .WithName("Login")
            .WithSummary("Autentica usuário e retorna JWT");

        group.MapGet("/me", Me)
            .RequireAuthorization()
            .WithName("Me")
            .WithSummary("Retorna dados do usuário autenticado");

        return group;
    }

    private static async Task<Results<Ok<LoginResponse>, BadRequest<string>>> Register(
        RegisterRequest request,
        IAuthService auth)
    {
        try
        {
            var result = await auth.RegisterAsync(request);
            return TypedResults.Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return TypedResults.BadRequest(ex.Message);
        }
    }

    private static async Task<Results<Ok<LoginResponse>, UnauthorizedHttpResult>> Login(
        LoginRequest request,
        IAuthService auth)
    {
        var result = await auth.LoginAsync(request);
        return result is not null
            ? TypedResults.Ok(result)
            : TypedResults.Unauthorized();
    }

    private static async Task<Results<Ok<UsuarioResponse>, NotFound>> Me(
        ClaimsPrincipal user,
        IUsuarioService usuarios)
    {
        // JwtBearer mapeia claim "sub" -> ClaimTypes.NameIdentifier por padrão
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? user.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrEmpty(id))
            return TypedResults.NotFound();

        var u = await usuarios.BuscarPorIdAsync(id);
        return u is not null
            ? TypedResults.Ok(usuarios.ToResponse(u))
            : TypedResults.NotFound();
    }
}
