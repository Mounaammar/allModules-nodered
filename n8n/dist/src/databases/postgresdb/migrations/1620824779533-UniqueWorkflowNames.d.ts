import { MigrationInterface, QueryRunner } from "typeorm";
export declare class UniqueWorkflowNames1620824779533 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
