using Anaminese.API.DTOs;

namespace Anaminese.API.Services;

public interface IPacienteService
{
    Task<PacienteResponse> CriarAsync(CriarPacienteRequest request);
    Task<PacienteResponse?> BuscarPorCpfAsync(string cpf);
}
