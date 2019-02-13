import {Observable} from 'rxjs/internal/Observable';
import axios from 'axios';
import {of} from 'rxjs/internal/observable/of';
import {from} from 'rxjs/internal/observable/from';

export class Search {
  private readonly accessKey: string = '';
  public constructor(key: string) {
    this.accessKey = key;
  }
  public findAll(q: string): Observable<any> {
    return from(axios.get(`https://api.bitbucket.org/2.0/teams/%7Bfc7be551-de51-4d14-a2f9-ed4d73b2ae93%7D/search/code?search_query=${q}&fields=%2Bvalues.file.commit.repository.mainbranch.name`, {
      headers: {
        Authorization: `Bearer ${this.accessKey}`
      }
    }));
  }
}