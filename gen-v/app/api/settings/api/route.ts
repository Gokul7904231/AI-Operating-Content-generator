import { NextRequest, NextResponse } from "next/server";
import { verifyAuthAndRole } from "@/lib/auth/auth";
import { ApiConfigManager } from "@/lib/api-config/api-config-manager";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthAndRole(request);
    const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

    const providers = await ApiConfigManager.getProviders();
    const summary = await ApiConfigManager.getSummary();

    return NextResponse.json({
      success: true,
      isAdmin,
      userRole: user.role,
      summary,
      providers,
    });
  } catch (err: any) {
    console.error("[API /settings/api GET] Error:", err.message);
    const status = err.status || err.name === "UnauthorizedError" ? 401 : err.name === "ForbiddenError" ? 403 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔐 Strict Admin Protection: OWNER or ADMIN required
    const user = await verifyAuthAndRole(request, "ADMIN");

    const body = await request.json();
    const { action, providerId, payload } = body;

    switch (action) {
      case "discover_models": {
        const { endpoint, localProviderType } = payload || {};
        if (!endpoint) {
          return NextResponse.json({ success: false, error: "Missing required parameter: endpoint" }, { status: 400 });
        }
        const models = await ApiConfigManager.discoverLocalModels(endpoint, localProviderType || "ollama");
        return NextResponse.json({ success: true, models });
      }

      case "update_primary": {
        if (!providerId) return NextResponse.json({ success: false, error: "Missing providerId" }, { status: 400 });
        const { apiKey, endpoint, model, localProviderType } = payload || {};
        await ApiConfigManager.updatePrimary(providerId, { apiKey, endpoint, model, localProviderType });
        return NextResponse.json({ success: true, message: `Primary configuration for "${providerId}" updated.` });
      }

      case "update_cloud_fallback": {
        if (!providerId) return NextResponse.json({ success: false, error: "Missing providerId" }, { status: 400 });
        const { allowCloudFallback } = payload || {};
        await ApiConfigManager.updateCloudFallbackPolicy(providerId, Boolean(allowCloudFallback));
        return NextResponse.json({ success: true, message: `Cloud fallback policy for "${providerId}" updated.` });
      }

      case "add_fallback": {
        if (!providerId) return NextResponse.json({ success: false, error: "Missing providerId" }, { status: 400 });
        const { name, apiKey, endpoint, mode, localProviderType, model } = payload || {};
        await ApiConfigManager.addFallback(providerId, { name, apiKey, endpoint, mode, localProviderType, model });
        return NextResponse.json({ success: true, message: `Fallback "${name}" added.` });
      }

      case "reorder_fallbacks": {
        if (!providerId) return NextResponse.json({ success: false, error: "Missing providerId" }, { status: 400 });
        const { fallbackIds } = payload || {};
        await ApiConfigManager.reorderFallbacks(providerId, fallbackIds);
        return NextResponse.json({ success: true, message: `Fallbacks reordered.` });
      }

      case "remove_fallback": {
        if (!providerId) return NextResponse.json({ success: false, error: "Missing providerId" }, { status: 400 });
        const { fallbackId } = payload || {};
        await ApiConfigManager.removeFallback(providerId, fallbackId);
        return NextResponse.json({ success: true, message: `Fallback removed.` });
      }

      case "toggle_provider": {
        if (!providerId) return NextResponse.json({ success: false, error: "Missing providerId" }, { status: 400 });
        const { enabled } = payload || {};
        await ApiConfigManager.toggleProvider(providerId, Boolean(enabled));
        return NextResponse.json({ success: true, message: `Provider "${providerId}" toggled.` });
      }

      default:
        return NextResponse.json({ success: false, error: `Unsupported action: "${action}"` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[API /settings/api POST] Error:", err.message);
    const status = err.status || err.name === "UnauthorizedError" ? 401 : err.name === "ForbiddenError" ? 403 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
