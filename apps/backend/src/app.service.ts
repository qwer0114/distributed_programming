import { Injectable } from "@nestjs/common";
import { isProd } from "@repo/lib";

@Injectable()
export class AppService {
  private readonly startTime: number = Date.now();

  getHello(): string {
    return `Hello from NestJS! Running in ${isProd() ? "production" : "development"} mode.`;
  }
}
