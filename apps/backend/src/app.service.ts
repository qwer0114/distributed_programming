import { Injectable } from "@nestjs/common";
import type { HealthCheckResponse } from "@repo/types";
import { isProd } from "@repo/lib";

@Injectable()
export class AppService {
  private readonly startTime: number = Date.now();

  getHello(): string {
    return `Hello from NestJS! Running in ${isProd() ? "production" : "development"} mode.`;
  }

  getHealth(): HealthCheckResponse {
    return {
      status: "ok",
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
