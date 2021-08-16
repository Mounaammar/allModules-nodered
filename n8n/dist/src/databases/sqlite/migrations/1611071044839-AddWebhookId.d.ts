import { MigrationInterface, QueryRunner } from "typeorm";
export declare class AddWebhookId1611071044839 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
