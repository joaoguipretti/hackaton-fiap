using Anaminese.API.DTOs;

namespace Anaminese.API.Services;

public interface IConsultorioService
{
    Task<ConsultorioResponse> CriarAsync(CriarConsultorioRequest request);
    Task<ConsultorioResponse?> BuscarPorIdAsync(string id);
    Task<IEnumerable<ConsultorioResponse>> ListarTodosAsync();
}
