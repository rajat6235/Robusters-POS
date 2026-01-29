import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api';

// Debug: Log the backend URL at startup

async function proxyRequest(request: NextRequest, method: string) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  const targetUrl = `${BACKEND_URL}/${path}${url.search}`;


  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Forward authorization header if present
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // Add body for non-GET requests
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    } catch {
      // No body to parse
    }
  }

  try {
    // 60s timeout to handle Render DB cold starts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    fetchOptions.signal = controller.signal;

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);

    // Get response body
    const responseBody = await response.text();

    // Return proxied response
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Backend request timed out — database may be waking up, please retry' : 'Failed to connect to backend' },
      { status: isTimeout ? 504 : 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, 'DELETE');
}
