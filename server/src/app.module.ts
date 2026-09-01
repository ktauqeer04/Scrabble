import { Module } from '@nestjs/common';
import { WebsocketsModule } from './websockets/websockets.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    WebsocketsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
