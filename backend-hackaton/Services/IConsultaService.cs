using Anaminese.API.DTOs;

namespace Anaminese.API.Services;

public interface IConsultaService
{
    Task<ConsultaResponse> CriarAsync(CriarConsultaRequest request);
    Task<ConsultaResponse?> BuscarPorIdAsync(string id);
    Task<IEnumerable<ConsultaResponse>> ListarPorPacienteAsync(string cpf);
}
