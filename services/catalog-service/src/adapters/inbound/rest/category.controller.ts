import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CATEGORY_SERVICE_PORT,
  CategoryServicePort,
} from '@domain/ports/inbound/category-service.port';
import { CreateCategoryDto, UpdateCategoryDto } from '@ext/catalog/adapters/inbound/rest/dto/generated/category.dto';

@Controller('categories')
export class CategoryController {
  constructor(
    @Inject(CATEGORY_SERVICE_PORT)
    private readonly categoryService: CategoryServicePort,
  ) {}

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.remove(id);
  }
}
