import type { SignUpPayload } from '@search-hub/schemas';

interface SignUpRequest {
    email: string;
    password: string;
}

export async function POST(request: NextRequest) {
    const req: SignUpRequest = request.json();
    console.log(req);

    // validate input

    //
}
