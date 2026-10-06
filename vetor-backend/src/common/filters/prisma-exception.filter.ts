import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Traduz os erros conhecidos do Prisma em respostas HTTP em vez de 500:
 * P2002 (violação de unique, ex.: CNPJ/placa duplicados) -> 409, P2003 (referência a registro que não existe, ex.:
 * midiaId inválido) -> 400, P2025 (registro não encontrado) -> 404.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'P2002') {
      const campos = (exception.meta?.target as string[] | undefined)?.join(', ');
      res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: campos ? `Já existe um registro com este valor de ${campos}.` : 'Registro duplicado.',
        error: 'Conflict',
      });
      return;
    }
    if (exception.code === 'P2003') {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Referência a um registro que não existe.',
        error: 'Bad Request',
      });
      return;
    }
    if (exception.code === 'P2025') {
      res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Registro não encontrado.',
        error: 'Not Found',
      });
      return;
    }
    super.catch(exception, host);
  }
}
