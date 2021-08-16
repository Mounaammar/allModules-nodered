import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class WebhookModel1592447867632 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
