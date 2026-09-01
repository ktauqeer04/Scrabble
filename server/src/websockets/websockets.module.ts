import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { AppModule } from 'src/app.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'REDIS_CLIENT',
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379
        }
      }
    ])
  ],
  providers: [ChatGateway],
})
export class WebsocketsModule {}
