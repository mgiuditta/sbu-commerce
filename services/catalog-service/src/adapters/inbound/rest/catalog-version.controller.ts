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
  CATALOG_VERSION_SERVICE_PORT,
  CatalogVersionServicePort,
} from '@domain/ports/inbound/catalog-version-service.port';
import { CreateCatalogVersionDto, UpdateCatalogVersionDto } from '@ext/catalog/adapters/inbound/rest/dto/generated/catalog-version.dto';

@Controller('catalog-versions')
export class CatalogVersionController {
  constructor(
    @Inject(CATALOG_VERSION_SERVICE_PORT)
    private readonly catalogVersionService: CatalogVersionServicePort,
  ) {}

  @Post()
  create(@Body() dto: CreateCatalogVersionDto) {
    return this.catalogVersionService.create(dto);
  }

  @Get()
  findAll() {
    return this.catalogVersionService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogVersionService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogVersionDto,
  ) {
    return this.catalogVersionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogVersionService.remove(id);
  }
}
