@echo off
echo 🚀 Testando API OpenRouter - Sistema Laura
echo ============================================
echo.

echo 📝 Testando modelo Grok Code Fast 1...
echo.

curl -X POST "https://openrouter.ai/api/v1/chat/completions" ^
  -H "Authorization: Bearer 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" ^
  -H "Content-Type: application/json" ^
  -H "HTTP-Referer: https://kabatec.com/sistema-laura" ^
  -H "X-Title: Sistema Laura Test" ^
  -d "{\"model\":\"x-ai/grok-code-fast-1\",\"messages\":[{\"role\":\"user\",\"content\":\"Olá! Você é o modelo Grok da xAI. Responda confirmando que está funcionando.\"}],\"max_tokens\":200,\"temperature\":0.1}"

echo.
echo ============================================
echo 📝 Testando modelo Qwen3 Max...
echo.

curl -X POST "https://openrouter.ai/api/v1/chat/completions" ^
  -H "Authorization: Bearer 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" ^
  -H "Content-Type: application/json" ^
  -H "HTTP-Referer: https://kabatec.com/sistema-laura" ^
  -H "X-Title: Sistema Laura Test" ^
  -d "{\"model\":\"qwen/qwen3-max\",\"messages\":[{\"role\":\"user\",\"content\":\"Olá! Você é o modelo Qwen3 Max. Responda confirmando que está funcionando.\"}],\"max_tokens\":200,\"temperature\":0.1}"

echo.
echo ============================================
echo 🎯 Testes concluídos!
echo.
pause
