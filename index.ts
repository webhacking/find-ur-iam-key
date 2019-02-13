import {from} from 'rxjs/internal/observable/from';
import {IAM} from 'aws-sdk';
import {bindNodeCallback} from 'rxjs/internal/observable/bindNodeCallback';
import {Observable} from 'rxjs/internal/Observable';
import {
  AccessKeyMetadata, accessKeyMetadataListType,
  ListAccessKeysResponse,
  ListUserPoliciesRequest,
  ListUsersResponse
} from 'aws-sdk/clients/iam';
import moment from 'moment';
import chalk from 'chalk';
import {concatMap, groupBy} from 'rxjs/operators';
import {of} from 'rxjs/internal/observable/of';
import {forkJoin} from 'rxjs/internal/observable/forkJoin';
import {throwError} from 'rxjs/internal/observable/throwError';
import {Search} from './src/Search';

const specificIam: string | null = process.argv[2] ? process.argv[2] : null;
const searchToken: string | null = '';
const AWS_ACCESS_KEY: string = '';
const AWS_SECRET_KEY: string = '';
const iamClient = new IAM({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY
});
console.log(chalk.greenBright(specificIam ? `Searching ${specificIam}..` : 'Searching ima users..'));
bindNodeCallback(iamClient.listUsers).bind(iamClient)().pipe(
  concatMap((listRes: ListUsersResponse) => {
    if (specificIam && listRes.Users.filter(user => user.UserName === specificIam).length <= 0) {
      return throwError(new Error('Sorry. iam user not found.'));
    }
    specificIam ? console.log(chalk.greenBright(`Found ${specificIam}`)) : console.log(chalk.greenBright(`Found  ${listRes.Users.length} users`));
    return forkJoin(
      listRes.Users.filter(user => {
        return !(specificIam && specificIam !== user.UserName);
      }).map(user => {
        return from(iamClient.listAccessKeys({
          UserName: user.UserName
        }).promise())
      })
    );
  }),
  concatMap((accessKeysRes: ListAccessKeysResponse[]) => {
    return of(accessKeysRes.map(accessKeyRes => {
      return accessKeyRes.AccessKeyMetadata.filter(accessKeyMetadata => {
        const ago: number = moment(new Date).diff(moment(accessKeyMetadata.CreateDate), 'days');
        if (ago < 90) {
          console.log(chalk.green(`${accessKeyMetadata.UserName}(${accessKeyMetadata.AccessKeyId}) is fine.`))
          return false;
        } else if (ago < 365) {
          console.log(chalk.yellow(`${accessKeyMetadata.UserName}(${accessKeyMetadata.AccessKeyId}) is recommend refresh. (${ago} days ago)`))
        } else {
          console.log(chalk.red(`${accessKeyMetadata.UserName}(${accessKeyMetadata.AccessKeyId}) is must refresh ! (${ago} days ago)`))
        }
        return true;
      })
    }).filter(x => x.length > 0));
  }),
  concatMap((accessKeyMetadatas: AccessKeyMetadata[][]) => {
    const search = new Search(searchToken);
    const clearAccessKeyMetadatas: AccessKeyMetadata[] = [];
    accessKeyMetadatas.map(accessKeyMetadata => accessKeyMetadata.map(metadata => clearAccessKeyMetadatas.push(metadata)));
    return forkJoin(
      clearAccessKeyMetadatas.map(clearAccessKeyMetadata => {
        return search.findAll(clearAccessKeyMetadata.AccessKeyId as string).pipe(
          concatMap((res: any) => of({meta: clearAccessKeyMetadata, ...res.data}))
        )
      })
    )
  })
).subscribe((x: any[]) => {
  x.forEach(xDash => {
    if (xDash.size > 0) {
      console.log(chalk.bgRedBright(`[${xDash.meta.UserName}(${xDash.meta.AccessKeyId})] Usage from bitbucket(${xDash.size})`))
    }
  })
})


