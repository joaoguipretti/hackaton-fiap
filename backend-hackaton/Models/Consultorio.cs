using Google.Cloud.Firestore;

namespace Anaminese.API.Models;

[FirestoreData]
public class Consultorio
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Nome { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Endereco { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Especialidade { get; set; } = nameof(EspecialidadeConsultorio.ClinicaGeral);

    [FirestoreProperty]
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
