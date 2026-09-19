using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Anaminese.API.DTOs;
using Anaminese.API.Models;
using Google.Cloud.Firestore;
using Microsoft.IdentityModel.Tokens;

namespace Anaminese.API.Services;

public class AuthService(
    IUsuarioService usuarios,
    IPacienteService pacientes,
    IConsultorioService consultorios,
    FirestoreDb db,
    IConfiguration config) : IAuthService
{
    private const string PacientesCollection = "pacientes";

    public async Task<LoginResponse> RegisterAsync(RegisterRequest request)
    {
        var consultorioId = request.ConsultorioId ?? string.Empty;
        if (request.Tipo == TipoUsuario.Recepcionista)
        {
            var consultorio = await consultorios.BuscarPorIdAsync(consultorioId)
                ?? throw new InvalidOperationException($"Consultório {consultorioId} não encontrado.");
            consultorioId = consultorio.Id;
        }

        var existente = await usuarios.BuscarPorEmailAsync(request.Email);
        if (existente is not null)
            throw new InvalidOperationException($"Já existe um usuário com o email {request.Email}.");

        if (request.Tipo == TipoUsuario.Paciente)
        {
            if (string.IsNullOrWhiteSpace(request.Cpf) || string.IsNullOrWhiteSpace(request.NomeCompleto))
                throw new InvalidOperationException("Paciente precisa de CPF e nome completo.");

            // Cria o Paciente no Firestore (documento com CPF como ID)
            var paciente = new Paciente
            {
                Cpf = request.Cpf,
                NomeCompleto = request.NomeCompleto,
                Endereco = request.Endereco ?? string.Empty,
                CartaoSus = request.CartaoSus,
                Idade = request.Idade ?? 0,
                Genero = request.Genero,
                Alergias = request.Alergias,
                CondicoesPrevias = request.CondicoesPrevias,
                MedicamentosUso = request.MedicamentosUso,
                ConsultorioId = consultorioId,
                CriadoEm = DateTime.UtcNow
            };
            await db.Collection(PacientesCollection).Document(paciente.Cpf).SetAsync(paciente);
        }

        var hash = BCrypt.Net.BCrypt.HashPassword(request.Senha);
        var usuario = await usuarios.CriarAsync(
            request.Email,
            hash,
            request.Tipo,
            consultorioId,
            request.Tipo == TipoUsuario.Paciente ? request.Cpf : null);

        return await BuildLoginResponseAsync(usuario);
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var usuario = await usuarios.BuscarPorEmailAsync(request.Email);
        if (usuario is null)
            return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash))
            return null;

        return await BuildLoginResponseAsync(usuario);
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var usuario = await usuarios.BuscarPorEmailAsync(request.Email);
        // Resposta genérica sempre, pra não revelar se o email existe (evita enumeração de usuários).
        const string mensagem = "Se o email estiver cadastrado, um código de redefinição foi gerado.";
        if (usuario is null)
            return new ForgotPasswordResponse(mensagem, null);

        var token = Guid.NewGuid().ToString("N");
        await usuarios.DefinirTokenResetSenhaAsync(usuario.Id, token, DateTime.UtcNow.AddMinutes(30));

        // Sem servidor de email configurado no projeto: devolve o token direto na resposta
        // pra viabilizar o fluxo de redefinição nesta demo (MVP).
        return new ForgotPasswordResponse(mensagem, token);
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var usuario = await usuarios.BuscarPorTokenResetSenhaAsync(request.Token);
        if (usuario is null || usuario.ResetSenhaExpiraEm is null || usuario.ResetSenhaExpiraEm < DateTime.UtcNow)
            return false;

        var hash = BCrypt.Net.BCrypt.HashPassword(request.NovaSenha);
        await usuarios.RedefinirSenhaAsync(usuario.Id, hash);
        return true;
    }

    private async Task<LoginResponse> BuildLoginResponseAsync(Usuario usuario)
    {
        var jwt = config.GetSection("Jwt");
        var secret = jwt["SecretKey"] ?? throw new InvalidOperationException("Jwt:SecretKey não configurado.");
        var issuer = jwt["Issuer"] ?? "Anaminese.API";
        var audience = jwt["Audience"] ?? "Anaminese.Client";
        var expiryMinutes = int.TryParse(jwt["ExpiryMinutes"], out var m) ? m : 60;

        var expiraEm = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id),
            new(JwtRegisteredClaimNames.Email, usuario.Email),
            new(ClaimTypes.Role, usuario.Tipo),
            new("consultorioId", usuario.ConsultorioId),
        };
        if (!string.IsNullOrWhiteSpace(usuario.Cpf))
            claims.Add(new Claim("cpf", usuario.Cpf));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiraEm,
            signingCredentials: creds);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        var paciente = usuario.Tipo == nameof(TipoUsuario.Paciente)
            && !string.IsNullOrWhiteSpace(usuario.Cpf)
            ? await pacientes.BuscarPorCpfAsync(usuario.Cpf)
            : null;

        return new LoginResponse(tokenString, expiraEm, usuarios.ToResponse(usuario), paciente);
    }
}
