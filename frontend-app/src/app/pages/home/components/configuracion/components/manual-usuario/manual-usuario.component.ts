import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-manual-usuario',
  templateUrl: './manual-usuario.component.html',
  styleUrls: ['./manual-usuario.component.scss'],
  standalone: false
})
export class ManualUsuarioComponent implements OnInit {

  dashboardImageError = false;
  productsImageError = false;
  createProductImageError = false;
  clientsImageError = false;
  financeImageError = false;
  reportsImageError = false;
  modulesImageError = false;
  usersImageError = false;
  
  constructor() { }

  ngOnInit() {}

}
