#!/usr/bin/env python3
"""
Test script for Grok Code Fast 1 model using OpenRouter API
Based on the examples from: https://openrouter.ai/x-ai/grok-code-fast-1
"""

import requests
import json

def test_grok_with_requests():
    """Test using Python requests library (similar to OpenAI SDK example)"""
    print("🐍 Testando Grok Code Fast 1 com Python Requests...")

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kabatec.com/sistema-laura",  # Optional
        "X-Title": "Sistema Laura - Teste Python",  # Optional
    }

    data = {
        "model": "x-ai/grok-code-fast-1",
        "messages": [
            {
                "role": "user",
                "content": "Olá! Você é o modelo Grok Code Fast 1 da xAI. Responda em português confirmando que está funcionando."
            }
        ],
        "max_tokens": 500,
        "temperature": 0.1
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print("✅ Resposta bem-sucedida!")
            print("Modelo usado:", result.get('model'))
            print("Conteúdo da resposta:")
            print(result['choices'][0]['message']['content'])
            print("\nUso de tokens:", result.get('usage'))
        else:
            print("❌ Erro na resposta:")
            print(response.text)

    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

def test_grok_simple():
    """Test simples baseado no exemplo da documentação"""
    print("\n🐍 Testando Grok Code Fast 1 - Exemplo Simples...")

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": "Bearer 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",
            "Content-Type": "application/json",
        },
        data=json.dumps({
            "model": "x-ai/grok-code-fast-1",
            "messages": [
                {
                    "role": "user",
                    "content": "Explique o que é agentic coding em uma frase."
                }
            ]
        })
    )

    if response.status_code == 200:
        result = response.json()
        print("✅ Resposta:", result['choices'][0]['message']['content'])
    else:
        print(f"❌ Erro: {response.status_code} - {response.text}")

if __name__ == "__main__":
    print("🚀 Testando Grok Code Fast 1 via OpenRouter API")
    print("=" * 60)

    test_grok_with_requests()
    test_grok_simple()

    print("\n🎯 Testes concluídos!")
