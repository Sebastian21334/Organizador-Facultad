import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PaginacionDto {
  @Transform(({ value }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 100;

  @Transform(({ value }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(0)
  @Max(10000)
  offset = 0;
}
