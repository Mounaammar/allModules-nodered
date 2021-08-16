import { MigrationInterface, QueryRunner } from "typeorm";
export declare class MakeStoppedAtNullable1607431743768 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
