using Application.Auth.Commands;
using Application.Auth.Handlers;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Nethereum.Signer;

namespace Application.Tests.Auth;

public class VerifySignatureCommandHandlerTests
{
    // Hardhat/Anvil accounts 0 and 1 — well-known test keys, never hold real funds.
    private const string TestPrivateKeyHex  = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    private const string OtherPrivateKeyHex = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

    private static IConfiguration EmptyConfig()
        => new ConfigurationBuilder().Build();

    private static IConfiguration ValidJwtConfig()
        => new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"]   = "TestSecretKeyThatIsLongEnoughForHMACSHA256AlgorithmRequirements!!",
                ["Jwt:Issuer"]   = "TestIssuer",
                ["Jwt:Audience"] = "TestAudience",
            })
            .Build();

    private static (string walletAddress, string signature) SignNonce(string nonceValue)
    {
        var key = new EthECKey(TestPrivateKeyHex);
        var signer = new EthereumMessageSigner();
        return (key.GetPublicAddress().ToLower(), signer.EncodeUTF8AndSign(nonceValue, key));
    }

    // ── Test 1 — User not found → throws Exception ──────────────────────────

    [Fact]
    public async Task Handle_UserNotFound_ThrowsException()
    {
        using var ctx = TestDbContextFactory.Create();
        var handler = new VerifySignatureCommandHandler(ctx, ValidJwtConfig());

        Func<Task> act = () => handler.Handle(
            new VerifySignatureCommand { WalletAddress = "0xdeadbeef", Signature = "0xsig" },
            CancellationToken.None);

        await act.Should().ThrowAsync<Exception>().WithMessage("*User not found*");
    }

    // ── Test 2 — Nonce not found → throws Exception ──────────────────────────

    [Fact]
    public async Task Handle_NoNonce_ThrowsException()
    {
        using var ctx = TestDbContextFactory.Create();
        ctx.Users.Add(new User { WalletAddress = "0xabc", Role = Role.INVESTOR, IsApproved = true });
        await ctx.SaveChangesAsync();

        var handler = new VerifySignatureCommandHandler(ctx, ValidJwtConfig());

        Func<Task> act = () => handler.Handle(
            new VerifySignatureCommand { WalletAddress = "0xabc", Signature = "0xsig" },
            CancellationToken.None);

        await act.Should().ThrowAsync<Exception>().WithMessage("*Nonce not found*");
    }

    // ── Test 3 — Expired nonce → throws Exception ────────────────────────────

    [Fact]
    public async Task Handle_ExpiredNonce_ThrowsException()
    {
        using var ctx = TestDbContextFactory.Create();
        ctx.Users.Add(new User { WalletAddress = "0xabc", Role = Role.INVESTOR, IsApproved = true });
        ctx.Nonces.Add(new Nonce
        {
            WalletAddress = "0xabc",
            Value = "nonce",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-1),
        });
        await ctx.SaveChangesAsync();

        var handler = new VerifySignatureCommandHandler(ctx, ValidJwtConfig());

        Func<Task> act = () => handler.Handle(
            new VerifySignatureCommand { WalletAddress = "0xabc", Signature = "0xsig" },
            CancellationToken.None);

        await act.Should().ThrowAsync<Exception>().WithMessage("*Nonce has expired*");
    }

    // ── Test 4 — Signature from wrong key → recovered address mismatch ────────

    [Fact]
    public async Task Handle_SignatureFromDifferentKey_ThrowsInvalidSignatureException()
    {
        using var ctx = TestDbContextFactory.Create();
        const string nonceValue = "some-nonce";
        var (walletAddress, _) = SignNonce(nonceValue);

        // Sign the same nonce with a DIFFERENT private key — recovered address won't match.
        var wrongKey = new EthECKey(OtherPrivateKeyHex);
        var wrongSig = new EthereumMessageSigner().EncodeUTF8AndSign(nonceValue, wrongKey);

        ctx.Users.Add(new User { WalletAddress = walletAddress, Role = Role.INVESTOR, IsApproved = true });
        ctx.Nonces.Add(new Nonce { WalletAddress = walletAddress, Value = nonceValue, ExpiresAt = DateTime.UtcNow.AddMinutes(5) });
        await ctx.SaveChangesAsync();

        var handler = new VerifySignatureCommandHandler(ctx, ValidJwtConfig());

        Func<Task> act = () => handler.Handle(
            new VerifySignatureCommand { WalletAddress = walletAddress, Signature = wrongSig },
            CancellationToken.None);

        await act.Should().ThrowAsync<Exception>().WithMessage("*Invalid signature*");
    }

    // ── Test 5 (NEW) — JWT secret absent → throws InvalidOperationException ───

    [Fact]
    public async Task Handle_JwtSecretMissing_ThrowsInvalidOperationException()
    {
        using var ctx = TestDbContextFactory.Create();
        const string nonceValue = "nonce-for-secret-check";
        var (walletAddress, signature) = SignNonce(nonceValue);

        ctx.Users.Add(new User { WalletAddress = walletAddress, Role = Role.INVESTOR, IsApproved = true });
        ctx.Nonces.Add(new Nonce { WalletAddress = walletAddress, Value = nonceValue, ExpiresAt = DateTime.UtcNow.AddMinutes(5) });
        await ctx.SaveChangesAsync();

        var handler = new VerifySignatureCommandHandler(ctx, EmptyConfig());

        Func<Task> act = () => handler.Handle(
            new VerifySignatureCommand { WalletAddress = walletAddress, Signature = signature },
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*JWT secret not configured*");
    }

    // ── Test 6 (NEW) — Full happy path → returns well-formed JWT token ────────

    [Fact]
    public async Task Handle_ValidSignatureAndConfig_ReturnsJwtToken()
    {
        using var ctx = TestDbContextFactory.Create();
        const string nonceValue = "nonce-for-happy-path";
        var (walletAddress, signature) = SignNonce(nonceValue);

        ctx.Users.Add(new User { WalletAddress = walletAddress, Role = Role.INVESTOR, IsApproved = true });
        ctx.Nonces.Add(new Nonce { WalletAddress = walletAddress, Value = nonceValue, ExpiresAt = DateTime.UtcNow.AddMinutes(5) });
        await ctx.SaveChangesAsync();

        var handler = new VerifySignatureCommandHandler(ctx, ValidJwtConfig());

        var result = await handler.Handle(
            new VerifySignatureCommand { WalletAddress = walletAddress, Signature = signature },
            CancellationToken.None);

        result.Should().NotBeNullOrEmpty();
        result.Split('.').Should().HaveCount(3, "a JWT consists of three dot-separated base64 segments");
        ctx.Nonces.Should().BeEmpty("the nonce must be consumed on successful authentication");
    }
}
