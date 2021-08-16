import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class InitialMigration1588102412422 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
