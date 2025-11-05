import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService ,CurrentUser} from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule,RouterModule ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  isLoggedIn = false;
  usuario: CurrentUser | null = null;
  isMenuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.usuario = user;
      
    });
  }

  logout() {
    this.isLoggedIn = false;
    this.isMenuOpen = false;
    this.authService.logout();
    this.router.navigate(['/']);
  }

  getInitials(): string {
  if (!this.usuario?.nombre) {
    return 'U';
  }
  
  const nombre = this.usuario.nombre.trim();
  return nombre.length >= 1 
    ? nombre.substring(0, 1).toUpperCase() 
    : nombre.charAt(0).toUpperCase();
}

}
