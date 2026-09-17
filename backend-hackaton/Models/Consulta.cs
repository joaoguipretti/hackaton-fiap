using Google.Cloud.Firestore;

namespace Anaminese.API.Models;

[FirestoreData]
public class Consulta
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty]
    public string PacienteCpf { get; set; } = string.Empty;

    [FirestoreProperty]
    public string ConsultorioId { get; set; } = string.Empty;

    [FirestoreProperty]
    public DateTime DataConsulta { get; set; } = DateTime.UtcNow;

    [FirestoreProperty]
    public string Severidade { get; set; } = nameof(SeveridadeManchester.Verde);

    [FirestoreProperty]
    public string? Observacoes { get; set; }

    [FirestoreProperty]
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
