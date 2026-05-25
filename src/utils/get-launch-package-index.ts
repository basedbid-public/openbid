import { LaunchPackageType } from 'enums/launch-package.type';

export const getLaunchPackageIndex = (launchPackage: LaunchPackageType) => {
  switch (launchPackage) {
    case LaunchPackageType.BASED:
      return 0;
    case LaunchPackageType.SUPER_BASED:
      return 1;
    case LaunchPackageType.ULTRA_BASED:
      return 2;
  }
};
