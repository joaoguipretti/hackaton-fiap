using Google.Cloud.Firestore;

namespace Anaminese.API.Models;

[FirestoreData]
public class Paciente
{
    [FirestoreDocumentId]
    public string Cpf { get; set; } = string.Empty;

    [FirestoreProperty]
    public string NomeCompleto { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Endereco { get; set; } = string.Empty;

    [FirestoreProperty]
    public string? CartaoSus { get; set; }

    [FirestoreProperty]
    public int Idade { get; set; }

    [FirestoreProperty]
    public string? Genero { get; set; }

    [FirestoreProperty]
    public string? Alergias { get; set; }

    [FirestoreProperty]
    public string? CondicoesPrevias { get; set; }

    [FirestoreProperty]
    public string? MedicamentosUso { get; set; }

    [FirestoreProperty]
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
