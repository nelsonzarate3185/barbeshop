from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class PaginacionEstandar(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'por_pagina'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'total': self.page.paginator.count,
            'paginas': self.page.paginator.num_pages,
            'pagina_actual': self.page.number,
            'siguiente': self.get_next_link(),
            'anterior': self.get_previous_link(),
            'resultados': data,
        })

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'total': {'type': 'integer'},
                'paginas': {'type': 'integer'},
                'pagina_actual': {'type': 'integer'},
                'siguiente': {'type': 'string', 'nullable': True},
                'anterior': {'type': 'string', 'nullable': True},
                'resultados': schema,
            },
        }
