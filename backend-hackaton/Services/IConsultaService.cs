using Anaminese.API.DTOs;

namespace Anaminese.API.Services;

public interface IConsultaService
{
    Task<ConsultaResponse> CriarAsync(CriarConsultaRequest request);
    Task<ConsultaResponse?> BuscarPorIdAsync(string id);
    Task<IEnumerable<ConsultaResponse>> ListarPorPacienteAsync(string cpf);
    Task<IEnumerable<ConsultaResponse>> ListarTodasAsync(int limite = 50);
    Task<IEnumerable<ConsultaResponse>> ListarPorConsultorioAsync(string consultorioId, int limite = 50);
    Task<ConsultaResponse?> AtualizarStatusAsync(string id, Anaminese.API.Models.StatusConsulta status, Anaminese.API.Models.SeveridadeManchester? severidade = null);
}
