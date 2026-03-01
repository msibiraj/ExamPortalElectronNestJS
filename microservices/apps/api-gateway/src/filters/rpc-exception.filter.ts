import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Already a proper HTTP exception (guards, validators, etc.)
    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json(exception.getResponse());
    }

    // RpcException from microservice (properly wrapped errors)
    if (exception instanceof RpcException) {
      const error = exception.getError();

      if (error instanceof HttpException) {
        return response.status(error.getStatus()).json(error.getResponse());
      }

      if (typeof error === 'object' && error !== null) {
        const err = error as any;
        const status = err.statusCode || err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        return response.status(status).json(err);
      }

      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: String(error),
      });
    }

    // Plain error or string thrown by firstValueFrom() when microservice
    // returns an unwrapped error via the Redis transport
    const message =
      typeof exception === 'string'
        ? exception
        : exception?.message || 'Internal Server Error';

    console.error('[Gateway] Unhandled microservice error:', exception);

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
    });
  }
}
