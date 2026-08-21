import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const apiUrlInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  if (!req.url.startsWith('http')) {
    const cloned = req.clone({
      url: `${environment.apiUrl}${req.url}`,
    });
    return next(cloned);
  }
  return next(req);
};
