import {ApiError} from './index';
import {Prisma} from '@prisma/client';
import httpStatus from 'http-status';

class PrismaError extends ApiError {
    constructor(error: Prisma.PrismaClientKnownRequestError) {
        let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Database error';

        switch (error.code) {
            case 'P2000':
                message = `The provided value for the column is too long for the column's type. Column: ${error.meta?.column_name}`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2001':
                message = `The record searched for in the where condition (${error.meta?.modelName}.${error.meta?.argument_name} = ${error.meta?.argument_value}) does not exist.`;
                statusCode = httpStatus.NOT_FOUND;
                break;
            case 'P2002':
                message = `${(error.meta?.target as string[]).join(', ') || 'unknown fields'}. must be unique for the ${error.meta?.modelName}`;
                statusCode = httpStatus.CONFLICT;
                break;
            case 'P2003':
                message = `Foreign key constraint failed on the field: ${error.meta?.target}`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2004':
                message = `A constraint failed on the database: ${error.message}`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2005':
                message = `The value ${error.meta?.field_value} stored in the database for the field ${error.meta?.target} is invalid for the field's type.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2006':
                message = `The provided value ${error.meta?.field_value} for ${error.meta?.model_name} field ${error.meta?.target} is not valid.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2007':
                message = `Data validation error: ${error.message}`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2008':
                message = `Failed to parse the query: ${error.meta?.query_parsing_error} at position ${error.meta?.query_position}.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2009':
                message = `Failed to validate the query: ${error.meta?.query_validation_error} at position ${error.meta?.query_position}.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2010':
                message = `Raw query failed. Code: ${error.meta?.code}. Message: ${error.message}.`;
                statusCode = httpStatus.INTERNAL_SERVER_ERROR;
                break;
            case 'P2011':
                message = `Null constraint violation on the ${error.meta?.constraint}.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2012':
                message = `Missing a required value at ${error.meta?.path}.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2013':
                message = `Missing the required argument ${error.meta?.argument_name} for field ${error.meta?.target} on ${error.meta?.object_name}.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2014':
                message = `The change you are trying to make would violate the required relation '${error.meta?.relation_name}' between the ${error.meta?.model_a_name} and ${error.meta?.model_b_name} models.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2015':
                message = `A related record could not be found. ${error.message}`;
                statusCode = httpStatus.NOT_FOUND;
                break;
            case 'P2016':
                message = `Query interpretation error: ${error.message}`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2017':
                message = `The records for relation ${error.meta?.relation_name} between the ${error.meta?.parent_name} and ${error.meta?.child_name} models are not connected.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2018':
                message = `The required connected records were not found. ${error.message}`;
                statusCode = httpStatus.NOT_FOUND;
                break;
            case 'P2019':
                message = `Input error: ${error.message}`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2020':
                message = `Value out of range for the type: ${error.message}`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2021':
                message = `The table ${error.meta?.table} does not exist in the current database.`;
                statusCode = httpStatus.NOT_FOUND;
                break;
            case 'P2022':
                message = `The column ${error.meta?.column} does not exist in the current database.`;
                statusCode = httpStatus.NOT_FOUND;
                break;
            case 'P2023':
                message = `Inconsistent column data: ${error.message}`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2024':
                message = `Timed out fetching a new connection from the connection pool. (Current connection pool timeout: ${error.meta?.timeout}, connection limit: ${error.meta?.connection_limit})`;
                statusCode = httpStatus.SERVICE_UNAVAILABLE;
                break;
            case 'P2025':
                message = `An operation failed because it depends on one or more records that were required but not found. ${error.message}`;
                statusCode = httpStatus.NOT_FOUND;
                break;
            case 'P2026':
                message = `The current database provider doesn't support a feature that the query used: ${error.meta?.feature}`;
                statusCode = httpStatus.NOT_IMPLEMENTED;
                break;
            case 'P2027':
                message = `Multiple errors occurred on the database during query execution: ${error.message}`;
                statusCode = httpStatus.INTERNAL_SERVER_ERROR;
                break;
            case 'P2028':
                message = `Transaction API error: ${error.message}`;
                statusCode = httpStatus.INTERNAL_SERVER_ERROR;
                break;
            case 'P2029':
                message = `Query parameter limit exceeded error: ${error.message}`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2030':
                message = `Cannot find a fulltext index to use for the search.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2031':
                message = `Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2032':
                message = `A number used in the query does not fit into a 64 bit signed integer. Consider using BigInt as field type if you're trying to store large integers.`;
                statusCode = httpStatus.BAD_REQUEST;
                break;
            case 'P2033':
                message = `Transaction failed due to a write conflict or a deadlock. Please retry your transaction.`;
                statusCode = httpStatus.CONFLICT;
                break;
            case 'P2034':
                message = `Assertion violation on the database: ${error.message}`;
                statusCode = httpStatus.INTERNAL_SERVER_ERROR;
                break;
            case 'P2035':
                message = `Error in external connector (id ${error.meta?.id}).`;
                statusCode = httpStatus.INTERNAL_SERVER_ERROR;
                break;
            case 'P2036':
                message = `Too many database connections opened: ${error.message}`;
                statusCode = httpStatus.SERVICE_UNAVAILABLE;
                break;
            default:
                message = error.message || 'Unknown database error';
                statusCode = httpStatus.INTERNAL_SERVER_ERROR;
                break;
        }

        super(statusCode, message);
    }
}

export default PrismaError;
