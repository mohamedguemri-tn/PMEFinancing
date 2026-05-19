using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IWebHostEnvironment _env;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IWebHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var walletAddress = context.User.FindFirst("wallet")?.Value ?? "anonymous";
        _logger.LogError(exception, "Unhandled exception for user {WalletAddress} on {Path}", walletAddress, context.Request.Path);

        context.Response.ContentType = "application/problem+json";
        
        var statusCode = exception switch
        {
            Application.Common.Exceptions.ValidationException => (int)HttpStatusCode.BadRequest,
            Application.Common.Exceptions.NotFoundException => (int)HttpStatusCode.NotFound,
            Application.Common.Exceptions.DuplicateException => (int)HttpStatusCode.Conflict,
            Application.Common.Exceptions.ForbiddenActionException => (int)HttpStatusCode.Forbidden,
            _ => (int)HttpStatusCode.InternalServerError
        };

        context.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = GetTitle(exception),
            Detail = exception.Message,
            Instance = context.Request.Path
        };

        if (_env.IsDevelopment())
        {
            problemDetails.Extensions["exception"] = exception.GetType().Name;
            problemDetails.Extensions["stackTrace"] = exception.StackTrace;
        }

        if (exception is Application.Common.Exceptions.ValidationException valEx)
        {
            problemDetails.Extensions["errors"] = valEx.Errors;
        }

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var json = JsonSerializer.Serialize(problemDetails, options);

        await context.Response.WriteAsync(json);
    }

    private string GetTitle(Exception exception) => exception switch
    {
        Application.Common.Exceptions.ValidationException => "Validation Error",
        Application.Common.Exceptions.NotFoundException => "Resource Not Found",
        Application.Common.Exceptions.DuplicateException => "Duplicate Resource",
        Application.Common.Exceptions.ForbiddenActionException => "Action Forbidden",
        _ => "An unexpected error occurred"
    };
}
