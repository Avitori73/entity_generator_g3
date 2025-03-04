import type { ColumnDefinition, CreateTable, JavaFile, JavaProperty } from '../src'
import { describe, expect, it } from 'vitest'
import { convertColumnDefinitionToJavaProperty, convertCreateTableToJavaEntityClass, convertCreateTableToJavaRepositoryInterface, writeJavaFile, writeJavaProperty } from '../src'

describe('test convertColumnDefinitionToJavaProperty', () => {
  it('should return java property from string column definition', () => {
    const varcharColumn: ColumnDefinition = {
      name: 'user_id_',
      datatype: 'varchar',
      nullable: false,
      length: 40,
    }
    const javaProperty = convertColumnDefinitionToJavaProperty(varcharColumn)
    expect(javaProperty).toEqual({
      field: {
        name: 'userId',
        type: 'String',
        accessModifier: 'private',
        isStatic: false,
        isFinal: false,
        defaultValue: null,
      },
      interfaces: [{ name: 'Column', attributes: ['name = "user_id_"', 'nullable = false', 'length = 40'] }],
    })
  })

  it('should return java property from integer column definition', () => {
    const columnDefinition: ColumnDefinition = {
      name: 'age_',
      datatype: 'integer',
      nullable: false,
    }
    const javaProperty = convertColumnDefinitionToJavaProperty(columnDefinition)
    expect(javaProperty).toEqual({
      field: {
        name: 'age',
        type: 'Integer',
        accessModifier: 'private',
        isStatic: false,
        isFinal: false,
        defaultValue: null,
      },
      interfaces: [{ name: 'Column', attributes: ['name = "age_"', 'nullable = false'] }],
    })
  })

  it('should return java property from numeric column definition', () => {
    const columnDefinition: ColumnDefinition = {
      name: 'balance_',
      datatype: 'numeric',
      nullable: true,
      precision: 16,
      scale: 2,
    }
    const javaProperty = convertColumnDefinitionToJavaProperty(columnDefinition)
    expect(javaProperty).toEqual({
      field: {
        name: 'balance',
        type: 'BigDecimal',
        accessModifier: 'private',
        isStatic: false,
        isFinal: false,
        defaultValue: 'BigDecimal.ZERO',
      },
      interfaces: [{ name: 'Column', attributes: ['name = "balance_"', 'precision = 16', 'scale = 2'] }],
    })
  })

  it('should return java property from timestamp column definition', () => {
    const columnDefinition: ColumnDefinition = {
      name: 'created_at_',
      datatype: 'timestamp',
      nullable: false,
    }
    const javaProperty = convertColumnDefinitionToJavaProperty(columnDefinition)
    expect(javaProperty).toEqual({
      field: {
        name: 'createdAt',
        type: 'LocalDateTime',
        accessModifier: 'private',
        isStatic: false,
        isFinal: false,
        defaultValue: null,
      },
      interfaces: [{ name: 'Column', attributes: ['name = "created_at_"', 'nullable = false'] }],
    })
  })

  it('should return java property from text column definition', () => {
    const columnDefinition: ColumnDefinition = {
      name: 'remark_',
      datatype: 'text',
      nullable: true,
    }
    const javaProperty = convertColumnDefinitionToJavaProperty(columnDefinition)
    expect(javaProperty).toEqual({
      field: {
        name: 'remark',
        type: 'String',
        accessModifier: 'private',
        isStatic: false,
        isFinal: false,
        defaultValue: null,
      },
      interfaces: [{ name: 'Column', attributes: ['name = "remark_"'] }],
    })
  })

  it('should throw an Error', () => {
    const columnDefinition: ColumnDefinition = {
      name: 'unknown_',
      datatype: 'unknown',
      nullable: false,
    }
    expect(() => convertColumnDefinitionToJavaProperty(columnDefinition)).toThrowError('Unknown datatype: unknown')
  })
})

describe('test writeJavaProperty', () => {
  it('should return java property string', () => {
    const javaProperty: JavaProperty = {
      field: {
        name: 'userId',
        type: 'String',
        accessModifier: 'private',
        isStatic: false,
        isFinal: false,
        defaultValue: null,
      },
      interfaces: [{ name: 'Column', attributes: ['name = "user_id_"', 'nullable = false', 'length = 40'] }],
    }
    const javaPropertyString = writeJavaProperty(javaProperty)
    expect(javaPropertyString).toEqual(['@Column(name = "user_id_", nullable = false, length = 40)', 'private String userId;'])
  })

  it('should return java property string with default value', () => {
    const javaProperty: JavaProperty = {
      field: {
        name: 'balance',
        type: 'BigDecimal',
        accessModifier: 'private',
        isStatic: false,
        isFinal: false,
        defaultValue: 'BigDecimal.ZERO',
      },
      interfaces: [{ name: 'Column', attributes: ['name = "balance_"', 'precision = 16', 'scale = 2'] }],
    }
    const javaPropertyString = writeJavaProperty(javaProperty)
    expect(javaPropertyString).toEqual(['@Column(name = "balance_", precision = 16, scale = 2)', 'private BigDecimal balance = BigDecimal.ZERO;'])
  })
})

describe('test convertCreateTableToJavaEntityClass', () => {
  it('should return java entity class string', () => {
    const createTable: CreateTable = {
      name: 'users',
      definitions: [
        { name: 'user_id_', datatype: 'varchar', nullable: false, length: 40 },
        { name: 'user_name_', datatype: 'varchar', nullable: false, length: 40 },
        { name: 'age_', datatype: 'integer', nullable: false },
        { name: 'balance_', datatype: 'numeric', nullable: true, precision: 16, scale: 2 },
        { name: 'remark_', datatype: 'text', nullable: true },
        { name: 'created_at_', datatype: 'timestamp', nullable: false },
      ],
      primaryKeys: ['user_id_'],
    }
    const javaEntityClass = convertCreateTableToJavaEntityClass(createTable)
    const expected: JavaFile = {
      type: 'class',
      imports: [
        'import java.math.BigDecimal;',
        'import com.a1stream.common.model.BaseEntity;',
        'import com.ymsl.solid.jpa.uuid.annotation.SnowflakeGenerator;',
        'import jakarta.persistence.Column;',
        'import jakarta.persistence.Entity;',
        'import jakarta.persistence.Id;',
        'import jakarta.persistence.Table;',
        'import lombok.Getter;',
        'import lombok.Setter;',
      ],
      package: 'package com.a1stream.domain.entity;',
      name: 'Users',
      properties: [
        {
          field: {
            name: 'serialVersionUID',
            type: 'long',
            accessModifier: 'private',
            isStatic: true,
            isFinal: true,
            defaultValue: '1L',
          },
        },
        {
          field: {
            name: 'userId',
            type: 'String',
            accessModifier: 'private',
            isStatic: false,
            isFinal: false,
            defaultValue: null,
          },
          interfaces: [
            { name: 'Id' },
            { name: 'SnowflakeGenerator' },
            { name: 'Column', attributes: ['name = "user_id_"', 'nullable = false', 'length = 40'] },
          ],
        },
        {
          field: {
            name: 'userName',
            type: 'String',
            accessModifier: 'private',
            isStatic: false,
            isFinal: false,
            defaultValue: null,
          },
          interfaces: [{
            name: 'Column',
            attributes: ['name = "user_name_"', 'nullable = false', 'length = 40'],
          }],
        },
        {
          field: {
            name: 'age',
            type: 'Integer',
            accessModifier: 'private',
            isStatic: false,
            isFinal: false,
            defaultValue: null,
          },
          interfaces: [{
            name: 'Column',
            attributes: ['name = "age_"', 'nullable = false'],
          }],
        },
        {
          field: {
            name: 'balance',
            type: 'BigDecimal',
            accessModifier: 'private',
            isStatic: false,
            isFinal: false,
            defaultValue: 'BigDecimal.ZERO',
          },
          interfaces: [{
            name: 'Column',
            attributes: ['name = "balance_"', 'precision = 16', 'scale = 2'],
          }],
        },
        {
          field: {
            name: 'remark',
            type: 'String',
            accessModifier: 'private',
            isStatic: false,
            isFinal: false,
            defaultValue: null,
          },
          interfaces: [{
            name: 'Column',
            attributes: ['name = "remark_"'],
          }],
        },
        {
          field: {
            name: 'createdAt',
            type: 'LocalDateTime',
            accessModifier: 'private',
            isStatic: false,
            isFinal: false,
            defaultValue: null,
          },
          interfaces: [{
            name: 'Column',
            attributes: ['name = "created_at_"', 'nullable = false'],
          }],
        },
      ],
      interfaces: [
        { name: 'Entity' },
        { name: 'Table', attributes: ['name = "users"'] },
        { name: 'Setter' },
        { name: 'Getter' },
      ],
      accessModifier: 'public',
      extends: 'BaseEntity',
    }
    expect(javaEntityClass).toEqual(expected)
  })
})

describe('test writeJavaFile', () => {
  it('should return java class string', () => {
    const javaFile: JavaFile = {
      type: 'class',
      imports: [
        'import java.math.BigDecimal;',
        'import com.a1stream.common.model.BaseEntity;',
        'import com.ymsl.solid.jpa.uuid.annotation.SnowflakeGenerator;',
        'import jakarta.persistence.Column;',
        'import jakarta.persistence.Entity;',
        'import jakarta.persistence.Id;',
        'import jakarta.persistence.Table;',
        'import lombok.Getter;',
        'import lombok.Setter;',
      ],
      package: 'package com.a1stream.domain.entity;',
      name: 'Users',
      properties: [
        {
          field: {
            name: 'serialVersionUID',
            type: 'long',
            accessModifier: 'private',
            isStatic: true,
            isFinal: true,
            defaultValue: '1L',
          },
        },
        {
          field: {
            name: 'userId',
            type: 'String',
            accessModifier: 'private',
            isStatic: false,
            isFinal: false,
            defaultValue: null,
          },
          interfaces: [{ name: 'Column', attributes: ['name = "user_id_"', 'nullable = false', 'length = 40'] }],
        },
        {
          field: {
            name: 'userName',
            type: 'String',
            accessModifier: 'private',
            isStatic: false,
            isFinal: false,
            defaultValue: null,
          },
          interfaces: [{ name: 'Column', attributes: ['name = "user_name_"', 'nullable = false', 'length = 40'] }],
        },
      ],
      interfaces: [{ name: 'Entity' }, { name: 'Table', attributes: ['name = "users"'] }, { name: 'Setter' }, { name: 'Getter' }],
      accessModifier: 'public',
      extends: 'BaseEntity',
    }
    const javaClassString = writeJavaFile(javaFile)
    expect(javaClassString).toEqual([
      'package com.a1stream.domain.entity;',
      'import java.math.BigDecimal;',
      'import com.a1stream.common.model.BaseEntity;',
      'import com.ymsl.solid.jpa.uuid.annotation.SnowflakeGenerator;',
      'import jakarta.persistence.Column;',
      'import jakarta.persistence.Entity;',
      'import jakarta.persistence.Id;',
      'import jakarta.persistence.Table;',
      'import lombok.Getter;',
      'import lombok.Setter;',
      '@Entity',
      '@Table(name = "users")',
      '@Setter',
      '@Getter',
      'public class Users extends BaseEntity {',
      'private static final long serialVersionUID = 1L;',
      '@Column(name = "user_id_", nullable = false, length = 40)',
      'private String userId;',
      '@Column(name = "user_name_", nullable = false, length = 40)',
      'private String userName;',
      '}',
    ])
  })

  it('should return java interface string', () => {
    const javaFile: JavaFile = {
      type: 'interface',
      imports: [
        'import org.springframework.stereotype.Repository;',
        `import com.a1stream.domain.entity.Users;`,
        'import com.ymsl.solid.jpa.repository.JpaExtensionRepository;',
      ],
      package: 'package com.a1stream.domain.repository;',
      name: 'UsersRepository',
      interfaces: [{ name: 'Repository' }],
      accessModifier: 'public',
      extends: 'JpaExtensionRepository<Users, Long>',
    }
    const javaInterfaceString = writeJavaFile(javaFile)
    expect(javaInterfaceString).toEqual([
      'package com.a1stream.domain.repository;',
      'import org.springframework.stereotype.Repository;',
      'import com.a1stream.domain.entity.Users;',
      'import com.ymsl.solid.jpa.repository.JpaExtensionRepository;',
      '@Repository',
      'public interface UsersRepository extends JpaExtensionRepository<Users, Long> {',
      '}',
    ])
  })
})

describe('test convertCreateTableToJavaRepositoryInterface', () => {
  it('should return java repository interface string', () => {
    const createTable: CreateTable = {
      name: 'users',
      definitions: [
        { name: 'user_id_', datatype: 'varchar', nullable: false, length: 40 },
        { name: 'user_name_', datatype: 'varchar', nullable: false, length: 40 },
        { name: 'age_', datatype: 'integer', nullable: false },
        { name: 'balance_', datatype: 'numeric', nullable: true, precision: 16, scale: 2 },
        { name: 'remark_', datatype: 'text', nullable: true },
        { name: 'created_at_', datatype: 'timestamp', nullable: false },
      ],
      primaryKeys: ['user_id_'],
    }
    const javaRepositoryInterface = convertCreateTableToJavaRepositoryInterface(createTable)
    const expected: JavaFile = {
      type: 'interface',
      imports: [
        'import org.springframework.stereotype.Repository;',
        `import com.a1stream.domain.entity.Users;`,
        'import com.ymsl.solid.jpa.repository.JpaExtensionRepository;',
      ],
      package: 'package com.a1stream.domain.repository;',
      name: 'UsersRepository',
      interfaces: [{ name: 'Repository' }],
      accessModifier: 'public',
      extends: 'JpaExtensionRepository<Users, Long>',
    }
    expect(javaRepositoryInterface).toEqual(expected)
  })
})
