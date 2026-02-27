import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

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
}
