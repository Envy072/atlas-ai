import { analyzeStartup } from "@/lib/services/analysis";
import { createProject } from "@/lib/services/projects";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { InvalidRequestError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (typeof message !== "string" || !message.trim()) {
      throw new InvalidRequestError('A non-empty "message" field is required.');
    }

    const analysis = await analyzeStartup(message);

    await createProject(analysis);

    return jsonSuccess(analysis);
  } catch (error) {
    return jsonError(error);
  }
}
